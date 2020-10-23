<div class="form">

<?php $form=$this->beginWidget('CActiveForm', array(
	'id'=>'alternative-form',
	'enableAjaxValidation'=>false,
)); ?>

	<p class="note">Les champs avec <span class="required">*</span> sont obligatoires.</p>

	<?php echo $form->errorSummary($model); ?>

	<div class="row">
		<?php echo $form->labelEx($model,'positionStart_id'); ?>
		<?php echo $form->dropDownList($model,'positionStart_id', CHtml::listData(Position::model()->findAll(), 'id', 'name')); ?>
		<?php echo $form->error($model,'positionStart_id'); ?>
	</div>

	<div class="row">
		<?php echo $form->labelEx($model,'positionAlternative_id'); ?>
		<?php echo $form->dropDownList($model,'positionAlternative_id', CHtml::listData(Position::model()->findAll(), 'id', 'name')); ?>
		<?php echo $form->error($model,'positionAlternative_id'); ?>
	</div>

	<div class="row">
		<?php echo $form->labelEx($model,'description'); ?>
		<?php echo $form->textArea($model,'description',array('rows' => 4, 'cols' => 50,'maxlength'=>250)); ?>
		<?php echo $form->error($model,'description'); ?>
	</div>	

	<div class="row buttons">
		<?php echo CHtml::submitButton($model->isNewRecord ? 'Create' : 'Save'); ?>
	</div>

<?php $this->endWidget(); ?>

</div><!-- form -->