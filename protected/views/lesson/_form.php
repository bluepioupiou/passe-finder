<div class="form">

<?php $form=$this->beginWidget('CActiveForm', array(
	'id'=>'lesson-form',
	'enableAjaxValidation'=>false,
)); ?>

	<p class="note">Les champs avec <span class="required">*</span> sont obligatoires.</p>

	<?php echo $form->errorSummary($model); ?>

	<div class="row">
		<?php echo $form->labelEx($model,'danse_id'); ?>
		<?php echo $form->dropDownList($model,'danse_id', CHtml::listData(Danse::model()->findAll(), 'id', 'name')); ?>
		<?php echo $form->error($model,'danse_id'); ?>
	</div>
	
	<div class="row">
		<?php 		
			if ($model->isNewRecord){
				$school = School::model()->findByPk($_GET['school_id']);
				echo $form->labelEx($model,'school_id');
				echo $school->name;
				echo $form->hiddenField($model,'school_id',array('value'=>$_GET['school_id']));
				echo $form->error($model,'school_id');
			} else {
				$school = $model->school;				
			}			
		?>		
	</div>
	
	<div class="row">
		<?php echo $form->labelEx($model,'userTeacher_id'); ?>
		<?php echo $form->dropDownList($model,'userTeacher_id', CHtml::listData(User::model()->findAll(array('order'=>'username ASC')), 'id', 'username'), 
			array('empty' => "Veuillez sélectionner un professeur...")
		); ?>
		<?php echo $form->error($model,'userTeacher_id'); ?>
	</div>

	<div class="row">
		<?php echo $form->labelEx($model,'name'); ?>
		<?php echo $form->textField($model,'name',array('size'=>45,'maxlength'=>45)); ?>
		<?php echo $form->error($model,'name'); ?>
	</div>

	<div class="row">
		<?php echo $form->labelEx($model,'description'); ?>
		<?php echo $form->textField($model,'description',array('size'=>60,'maxlength'=>250)); ?>
		<?php echo $form->error($model,'description'); ?>
	</div>

	<div class="row">
		<?php echo $form->labelEx($model,'time'); ?>
		<?php echo $form->textField($model,'time',array('size'=>60,'maxlength'=>100)); ?>
		<?php echo $form->error($model,'time'); ?>
	</div>
	
	<div class="row">
		<?php echo $form->labelEx($model,'openInscription'); ?>
		<i>Si coché, les inscriptions aux cours seront automatiquements validées</i><br />
		<?php echo $form->checkBox($model,'openInscription', array()); ?>
		<?php echo $form->error($model,'openInscription'); ?>
	</div>
	
	<div class="row">
				<?php echo $form->labelEx($model,'private'); ?>
				<i>Un cours privé aura tous ses enchainements obligatoirement privés</i><br />
				<?php
					$options = array();
					if ($school->private){
						$options = array('checked'=>'checked', 'disabled'=>'disabled');
					}
				?>
				<?php echo $form->checkBox($model,'private', $options); ?>
				<?php echo $form->error($model,'private'); ?>
			</div>

	<div class="row buttons">
		<?php echo CHtml::submitButton($model->isNewRecord ? 'Create' : 'Save'); ?>
	</div>

<?php $this->endWidget(); ?>

</div><!-- form -->