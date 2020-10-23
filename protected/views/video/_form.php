<script>
	function onSelectedLesson(id){		
		if(id!=0){
			document.getElementById("enchainement_info").style.display="block";
		}
		else {
			document.getElementById("enchainement_info").style.display="none";
		}
	}	
</script>

<div class="form">

<?php $form=$this->beginWidget('CActiveForm', array(
	'id'=>'video-form',
	'enableAjaxValidation'=>false,
)); ?>

	<p class="note">Les champs avec <span class="required">*</span> sont obligatoires.</p>

	<?php echo $form->errorSummary($model); ?>

	<div class="row">
		<?php echo $form->labelEx($model,'description'); ?>
		<?php echo $form->textField($model,'description',array('size'=>60,'maxlength'=>250)); ?>
		<?php echo $form->error($model,'description'); ?>
	</div>	
	
	<div class="row">
		<?php echo $form->labelEx($model,'enchainement_id'); ?>
		<?php /*echo  CHtml::checkbox('onlyNotChoosen',$model->isNewRecord ? true : false, 
			array('ajax' => array(
					'type'=>'POST', 
					'url'=>CController::createUrl('getAllEnchainementForUser'),
					'data'=>array('idLesson'=>'js:$(\'#lesson_id\').val()'),
					'update'=> '#'.CHtml::activeId($model, 'enchainement_id')					
				),
				'return' => true
			));*/
		?>
		<!--<i>N'afficher que les enchainements n'ayant pas encore de vidéo</i>
		<br />-->
		<?php 
			$options = CHtml::listData(Yii::app()->getModule('user')->user()->enchainementsCreated, 'id', 'name');
			echo $form->dropDownList($model,'enchainement_id', $options); 
		?>
		<?php echo $form->error($model,'enchainement_id'); ?>
	</div>	
	
	<div class="row">
		<?php echo $form->labelEx($model,'youtube_url'); ?>
		<i>Il vous suffit de copier le numéro d'identification Youtube de votre vidéo. Il s'agit de la suite de caractère après "..watch?v=" dans votre url</i> <br />
		<?php echo $form->textField($model,'youtube_url',array('size'=>60,'maxlength'=>250)); ?>
		<?php echo $form->error($model,'youtube_url'); ?>
	</div>

	<div class="row buttons">
		<?php echo CHtml::submitButton($model->isNewRecord ? 'Créer' : 'Sauvegarder'); ?>
	</div>

<?php $this->endWidget(); ?>

</div><!-- form -->