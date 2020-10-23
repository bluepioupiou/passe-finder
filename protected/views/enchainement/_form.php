<script>
	function onSelectedLesson(id){		
		
		if(id!=0){
			document.getElementById("lesson_info").style.display="block";
			document.getElementById("danse_info").style.display="none";
		}
		else {
			document.getElementById("lesson_info").style.display="none";
			document.getElementById("danse_info").style.display="block";
		}
	}
	
	function onSelectedDanse(id){				
        document.getElementById("next_passe").style.display="none";
        document.getElementById("save").style.display="none";
	}
    
    function onSelectedFirstPasse(id){			
		if(id!=0){
			document.getElementById("next_passe").style.display="block";
			document.getElementById("save").style.display="block";			
		}
		else {
			document.getElementById("next_passe").style.display="none";
			document.getElementById("save").style.display="none";
		}
	}

	function getBeforeLastPasse(){			
		$ids = document.getElementById("enchainementPasses_id").value;
		$id_tab = $ids.split(",");
		return $id_tab[$id_tab.length-2];
	}	
	
	function deleteLastPasse(){			
		$allpasses = document.getElementById("allpasses").innerHTML;
		$allpasses = $allpasses.substr(0,$allpasses.lastIndexOf("<li>"));
		document.getElementById("allpasses").innerHTML = $allpasses;
		
		$allids = document.getElementById("enchainementPasses_id").value;
		$allids = $allids.substr(0,$allids.lastIndexOf(","));
		document.getElementById("enchainementPasses_id").value = $allids;			
	}	
	
</script>

<div class="form">

<?php $form=$this->beginWidget('CActiveForm', array(
	'id'=>'enchainement-form',
	'enableAjaxValidation'=>false,
)); ?>
	<div>Choisir la danse    
    <?php 
        echo CHtml::dropDownList('danse_id','', CHtml::listData(Danse::model()->findAll(), 'id', 'name'),
			array(
                'onChange' => 'javascript:onSelectedDanse(this.selectedIndex)',
                'ajax' => array(
                        'type'=>'POST',
                        'url'=>CController::createUrl('passe/dynamicPasses'), 
                        'update'=>'#firstpasse_id'
                    )
            )
		); 
    ?>
    </div>
	<div>Commencer avec une passe
	<?php 
		$firstpasse_id='';
		if (!$model->isNewRecord){
			$firstpasse_id = EnchainementPasse::model()->findByAttributes(array('enchainement_id'=>$model->id,'order'=>'1'))->passe_id;
			$lastcomposition = EnchainementPasse::model()->findByAttributes(array('enchainement_id'=>$model->id,'order'=>($model->passesCount+$model->alternativesCount)));
			if ($lastcomposition->passe_id != null){
				$lastname = $lastcomposition->passe->name;
				$lastposition_id = $lastcomposition->passe->positionEnd_id;
			} else {
				$lastname = $lastcomposition->position->name;
				$lastposition_id = $lastcomposition->position->id;
			}
		}
                
		echo CHtml::dropDownList('firstpasse_id', $firstpasse_id, CHtml::listData(Passe::model()->findAll(array('order' => 'name ASC', 'condition'=>'pending=0')), 'id', 'name'),
			array('empty' => "Choisir une passe...",
				'onChange' => 'javascript:onSelectedFirstPasse(this.selectedIndex)',
				'ajax' => array(
					'type'=>'POST', 
					'url'=>CController::createUrl('getNextPasses'),
					'dataType'=>'json',
					'data'=>array('idPasse'=>'js:this.value'),  
                    'success'=>'function(data) {
						$("#nextpasse_id").html(data.dropDownPasses);
						$("#alternative_id").html(data.dropDownAlternatives);
						$("#allpasses").html("<li>"+data.newpasse.name+"</li>");	
						$("#lastpasse").html(data.newpasse.name);	
						$("#enchainementPasses_id").val(data.newpasse.id);							
					}',
				)	
			)
		); ?>
	</div>
	
	<div id="next_passe" style="display:<?php echo $model->isNewRecord ? "none" : "block"?>;">
		<br /><hr /><br />
		Enchainer avec une passe
		<?php 
			$options = array();
			if (!$model->isNewRecord){
				$options = CHtml::listData(Passe::model()->findAll('positionStart_id='.$lastposition_id, array('order' => 'name ASC')), 'id', 'name');
			}
			echo CHtml::dropDownList('nextpasse_id', '',  $options,
			array('empty' => "Choisir une passe...",
				'ajax' => array(
					'type'=>'POST', 
					'url'=>CController::createUrl('getNextPasses'),
					'dataType'=>'json',
                    'data'=>array('idPasse'=>'js:this.value'),  
                    'success'=>'function(data) {
						$("#nextpasse_id").html(data.dropDownPasses);
						$("#alternative_id").html(data.dropDownAlternatives);
						$("#allpasses").append("<li>"+data.newpasse.name+"</li>");
						$("#lastpasse").html(data.newpasse.name);	
						$old = $("#enchainementPasses_id").val();
						$("#enchainementPasses_id").val($old+","+data.newpasse.id);		
					}',
				)	
			)); ?>
		<br />
		Alterner la position de fin
		<?php 
			$options = array();
			if (!$model->isNewRecord){
				$options = CHtml::listData(Alternative::model()->findAll('positionStart_id=:position_id', array(':position_id'=>(int) $lastposition_id), array('order' => 'positionAlternative.name ASC')), 'positionAlternative.id', 'positionAlternative.name');
			}			
			echo CHtml::dropDownList('alternative_id', '',  $options,
			array('empty' => "Choisir une alternative...",
				'ajax' => array(
					'type'=>'POST', 
					'url'=>CController::createUrl('getNextPassesWithAlternative'),
					'dataType'=>'json',
                    'data'=>array('idPosition'=>'js:this.value'),  
                    'success'=>'function(data) {
						$("#nextpasse_id").html(data.dropDownPasses);
						$("#alternative_id").display="none";
						$("#allpasses").append("<li>-->"+data.newposition.name+"</li>");
						$("#lastpasse").html(data.newposition.name);	
						$old = $("#enchainementPasses_id").val();
						$("#enchainementPasses_id").val($old+",a"+data.newposition.id);		
					}',
				)	
			)); ?>
		<br />
		Dernière passe ajoutée : <div id="lastpasse" >
		<?php 
			if (!$model->isNewRecord){
				echo $lastname;
			}
		?>
		</div>
		<?php 
			echo CHtml::button('Supprimer', array(
				'ajax' => array(
					'type'=>'POST', 
					'url'=>CController::createUrl('getNextPasses'),
					'dataType'=>'json',
					'data'=>array('idPasse'=>'js:getBeforeLastPasse()'),  
					'success'=>'function(data) {
						$("#nextpasse_id").html(data.dropDownPasses);
						$("#alternative_id").html(data.dropDownAlternatives);
						$("#lastpasse").html(data.newpasse.name);	
						deleteLastPasse();
					}',
				)	
			)); 
		?>		
		<br /><hr /><br />
		Enchainement en cours :<br />
		<div id="allpasses" >
		<?php 
			if (!$model->isNewRecord){
				foreach($model->enchainementPasses as $enchainementPasse){
					if ($enchainementPasse->passe_id != null){
						echo "<li>".$enchainementPasse->passe->name."</li>";
					} else {
						echo "<li>-->".$enchainementPasse->position->name."</li>";
					}
					
				}
			}	
		?>
		</div>
	</div>		
	
	<div id="save" style="display:<?php echo $model->isNewRecord ? 'none' : 'block'?>;"> 
		<br /><hr /><br />
		Sauvegarder cet enchainement
		<p class="note">Les champs avec <span class="required">*</span> sont obligatoires.</p>

		<?php echo $form->errorSummary($model); ?>
		
		<?php 
			$hidden = '';
			if (!$model->isNewRecord){
				foreach($model->enchainementPasses as $enchainementPasse){
					if ($hidden != ''){
						$hidden .= ",";
					}
					if ($enchainementPasse->passe_id != null){
						$hidden .= $enchainementPasse->passe->id;
					} else {
						$hidden .= 'a'.$enchainementPasse->position->id;
					}
				}
			}
			echo CHtml::hiddenField('enchainementPasses_id',$hidden); 
		?>		

		<div class="row">
			<?php echo $form->labelEx($model,'name'); ?>
			<?php echo $form->textField($model,'name',array('size'=>50,'maxlength'=>50)); ?>
			<?php echo $form->error($model,'name'); ?>
		</div>

		<div class="row">
			<?php echo $form->labelEx($model,'commentaire'); ?>
			<?php echo $form->textArea($model,'commentaire',array('rows'=>6, 'cols'=>50)); ?>
			<?php echo $form->error($model,'commentaire'); ?>
		</div>			
		
		<div class="row">
			<?php echo $form->labelEx($model,'published'); ?>
			<i>Un enchainement non publié ne pourra être vu que par son créateur</i><br />
			<?php echo $form->checkBox($model,'published'); ?>
			<?php echo $form->error($model,'published'); ?>
		</div>
		<?php 
			if (Yii::app()->getModule('user')->user()->lessonsAsTeacherCount >0){
		?>
		<div class="row">
			<?php echo $form->labelEx($model,'lesson_id'); ?>
			<?php echo $form->dropDownList($model,'lesson_id', CHtml::listData(Yii::app()->getModule('user')->user()->lessonsAsTeacher, 'id', 'name'),
				array('empty' => "Ne pas associer à un cours",
					'onChange' => 'javascript:onSelectedLesson(this.selectedIndex)',
					'ajax' => array(
					'type'=>'POST', 
					'url'=>CController::createUrl('lesson/isPrivate'),
					'dataType'=>'json',
                    'data'=>array('idLesson'=>'js:this.value'),  
                    'success'=>'function(isPrivate) {
						$("#Enchainement_private").prop("checked", isPrivate);
						$("#Enchainement_private").prop("disabled", isPrivate);
					}',
				)						
			)); ?>
			<?php echo $form->error($model,'lesson_id'); ?>
		</div>	
		<?php
			}
		?>
		
		<div class="row" id="danse_info" style="display:<?php if(!$model->lesson_id) echo "block"; else echo "none";?>;>
			<?php echo $form->labelEx($model,'danse_id'); ?>
			<?php echo $form->dropDownList($model,'danse_id', CHtml::listData(Danse::model()->findAll(), 'id', 'name')); ?>
			<?php echo $form->error($model,'danse_id'); ?>
		</div>	
		
		<div id="lesson_info" style="display:<?php if($model->lesson_id) echo "block"; else echo "none";?>;">			
			<div class="row">
				<?php echo $form->labelEx($model,'dateEvent'); ?>
				<?php	$this->widget('zii.widgets.jui.CJuiDatePicker', array(
					'model' => $model,
					'attribute' => 'dateEvent',
					'language' => 'fr',
					'options' => array(
						'showAnim' => 'fold',
						'dateFormat' => 'yy-mm-dd', 
						'defaultDate' => $model->dateEvent,
						'changeYear' => true,
						'changeMonth' => true,
						'yearRange' => '1900',
					)
				)); ?>
				<?php echo $form->error($model,'dateEvent'); ?>
			</div>
			
			<div class="row">
				<?php echo $form->labelEx($model,'private'); ?>
				<i>Un enchainement privé ne pourra être vu que par les élèves inscrits à ce cours</i><br />
				<?php echo $form->checkBox($model,'private'); ?>
				<?php echo $form->error($model,'private'); ?>
			</div>

			<div class="row">
				<?php echo $form->labelEx($model,'difficulty'); ?>
				<?php echo $form->dropDownList($model,'difficulty', array(1=>1, 2=>2, 3=>3, 4=>4, 5=>5)); ?>
				<?php echo $form->error($model,'difficulty'); ?>
			</div>
		</div>
		<div class="row buttons">
			<?php echo CHtml::submitButton($model->isNewRecord ? 'Create' : 'Enregistrer'); ?>
		</div>
	</div>

<?php $this->endWidget(); ?>

</div><!-- form -->